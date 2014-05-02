/** @jsx React.DOM */

var DownloadAlbum = React.createClass({
  handleRemove: function() {
    this.props.removeAlbumDownload(this.props.key);
    return false;
  },
  render: function() {
    return (
      <div>
        {this.props.key} <a href="" onClick={this.handleRemove}> (remove)</a>
      </div>
    )
  }
});

var DownloadAlbums = React.createClass({
  render: function() {
    var that = this;
    var selected_albums = [];
    this.props.albumsToDownload.forEach(function(a) {
      selected_albums.push(<li key={a}><DownloadAlbum removeAlbumDownload={that.props.removeAlbumDownload} key={a}/></li>);
    });
    var heading = selected_albums.length > 0 ? <h3>Selected for download</h3> : null;
    var download = selected_albums.length > 0 ? 
      <a href="/download" className="btn btn-primary form-control">Download Selected</a> : null;
    return (
      <div>
        {heading}
        <ul>
          {selected_albums}
        </ul>
        <div className="col-sm-2">
          {download}
        </div>
      </div>
    );
  }
});

var PopOver = React.createClass({
  componentDidMount: function() {
    $(this.getDOMNode())
      .popover({html: true, content: this.props.children})
  },
  componentWillUnmount: function() {
    $(this.getDOMNode()).off('hidden', this.handleHidden);
  },
  handleClick: function() {
    $(this.getDOMNode())
      .popover('show')
  },
  render: function() {
    return this.transferPropsTo(
      <div>
        <a href="#" onClick={this.handleClick}>{this.props.linkText}</a>
        <div className="data-content">
          This is a test
        </div>
      </div>
    );
  }
});

var Id3Tags = React.createClass({
  render: function() {
    var tag_lines = [];

    for (tag in this.props.tags) {
      tag_lines.push(<li key={tag}>{tag}: {this.props.tags[tag]}</li>);
    }

    return (
      <ul>
        {tag_lines}
      </ul>
    )
  }
})

var Track = React.createClass({
  getInitialState: function() {
    $.ajax({
      url: 'id3/' + this.props.key,
      dataType: 'json',
      mimeType: 'textPlain',
      success: function(data) {
        this.setState({id3Tags: data});
      }.bind(this),
      error: function(err) {
        console.log('/id3 error: ' + err);
      }.bind(this)
    });
    return {displayTags: false, id3Tags:{}};
  },
  handleClick: function() {
    this.setState({displayTags: !this.state.displayTags});
  },
  render: function() {
    var uri = "/file/" + this.props.key;
    var tags = this.state.displayTags ? <Id3Tags tags={this.state.id3Tags} /> : null;
    return (
      <div>
        <a href={uri}>{this.props.name}</a>
        --
        <a href="#" onClick={this.handleClick}>(tags)</a>
        <div>
          {tags}
        </div>
      </div>
    );
  }
});

var Tracks = React.createClass({
  render: function() {
    var tracks_ = this.props.tracks;
    tracks_.sort()
    var tracks = tracks_.map(function(t) {
      var r = /.*\/(.*\.mp3)/.exec(t);
      var name = r[1];
      return <li key={t}><Track key={t} name={name} /></li>
    });
    return (
      <ul>
        {tracks}
      </ul>
    );
  }
});

var AlbumLine = React.createClass({
  getInitialState: function() {
    return {displayTracks: false};
  },
  handleAlbumClick: function(event) {
    this.setState({displayTracks: !this.state.displayTracks});
    return false;
  },
  handleAdd: function(event) {
    this.props.addAlbumDownload(this.props.key);
    return false;
  },
  render: function() {
    var tracks = this.state.displayTracks ? <Tracks tracks={this.props.album.tracks} /> : null;
    var add = this.props.selected ? 'selected' : <button type="button" className="btn btn-default" onClick = {this.handleAdd}>add</button>;
    return (
      <tr key={this.props.key}>
        <td>{this.props.album.genre}</td>
        <td>{this.props.album.artist}</td>
        <td>
          <p><a href="" onClick={this.handleAlbumClick}>{this.props.album.album}</a></p>
          <p>{tracks}</p>
        </td>
        <td>
          {add}
        </td>
      </tr>
    ); 
  }
});

var AlbumList = React.createClass({
  getInitialState: function() {

    $.get('/download-list', function(data) {
      this.setState({albumsToDownload: data});
    }.bind(this));

    return {albums: [], albumsToDownload: []};
  },
  updateAlbumsDownload: function(albums) {
    var that = this;
    $.post('/download-list', {albums: albums}, function(data) {
      console.log(data);
      $.get('/download-list', function(data) {
        that.setState({albumsToDownload: data});
      }.bind(that));
    }.bind(this));
  },
  addAlbumDownload: function(album) {
    var a = this.state.albumsToDownload;
    a.push(album);
    this.updateAlbumsDownload(a);
  },
  removeAlbumDownload: function(album) {
    var index = this.state.albumsToDownload.indexOf(album);
    if (index > -1) {
      var a = this.state.albumsToDownload;
      a.splice(index, 1);
      this.updateAlbumsDownload(a);
    }
  },
  render: function() {
    var that = this;
    var album_lines = [];

    this.props.albums.forEach(function(a) {
      var r;
      if (r = /(.*)\/(.*)\/(.*)/.exec(a.key)) {
        var a_ = {
          genre: r[1],
          artist: r[2],
          album: r[3],
          tracks: a.tracks
        }
        var selected = false;
        if (that.state.albumsToDownload.indexOf(a.key) > -1) {
          selected = true;
        }
        album_lines.push(<AlbumLine key={a.key} album={a_} addAlbumDownload={that.addAlbumDownload} selected={selected} />);
      }
    })

    return (
      <div>
      <DownloadAlbums removeAlbumDownload={this.removeAlbumDownload} albumsToDownload={this.state.albumsToDownload} />
      <table className="table table-striped">
        <thead>
          <tr>
            <th>Genre</th>
            <th>Artist</th>
            <th>Album</th>
            <th>Add to Download</th>
          </tr>
        </thead>
        <tbody>
          {album_lines}
        </tbody>
      </table>
      </div>
    );
  }
});

var ToolBar = React.createClass({
  getInitialState: function() {
    $.get('/search', function(data) {
      this.setState({artist: data.artist});
      this.setState({album: data.album});
      this.setState({tags: data.tags});
    }.bind(this));

    return {artist: '', album: '', tags: ''};
  },
  handleSearch: function(event) {
    console.log("handleSearch");
    var search = this.state;
    $.post('/search', {search: this.state}, function(data) {
      console.log('post search returns ' + data);
      this.props.callback();
    }.bind(this));
    return false;
  },
  handleArtist: function(event) {
    this.setState({artist: event.target.value});
  },
  handleAlbum: function(event) {
    this.setState({album: event.target.value});
  },
  handleTags: function(event) {
    this.setState({tags: event.target.value});
  },
  handleClear: function(event) {
    var s = {artist: '', album: '', tags: ''};
    this.setState(s); 
    $.post('/search', {search: s}, function(data) {
      console.log('post search returns ' + data);
      this.props.callback();
    }.bind(this));
    return false;
  },
  render: function() {
    return (
      <div className="navbar navbar-inverse navbar-fixed-top" role="navigation">
      <div className="container">
      <div className="navbar-header">
      <button type="button" className="navbar-toggle" data-toggle="collapse" data-target=".navbar-collapse">
      <span className="sr-only">Toggle navigation</span>
      <span className="icon-bar"></span>
      <span className="icon-bar"></span>
      <span className="icon-bar"></span>
      </button>
      <a className="navbar-brand" href="#">MP3 Browser</a>
      </div>
      <div className="navbar-collapse collapse">
      <form className="navbar-form navbar-right" role="form" onSubmit={this.handleSearch}>
        <div className="form-group">
          <input type="text" placeholder="search" className="form-control" value={this.state.artist} onChange={this.handleArtist} />
          <button className="btn btn-success">Search</button>
          <button className="btn btn-warning" onClick={this.handleClear}>Clear</button>
        </div>
      </form>
      </div>
      </div>
      </div>
    );
  }
});

var App = React.createClass({
  getInitialState: function() {
    this.searchCallback();
    return {albums: []};
  },
  searchCallback: function() {
    $.get('/albums', function(data) {
      this.setState({albums: data});
    }.bind(this));
    console.log("searchCallback");
  },
  render: function() {
    return (
      <div>
        <ToolBar callback={this.searchCallback} />
        <AlbumList albums={this.state.albums} />
      </div>
    );
  }
});

React.renderComponent(
  <App />,
  document.getElementById('album-list')
);


