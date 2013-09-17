/** @jsx React.DOM */

var albumsToDownload = [];

var DownloadAlbums = React.createClass({
  handleClick: function() {
    console.log(albumsToDownload);
    $.post('/update_selected', {albums: albumsToDownload}, function(data) {
      console.log("Post returned");
      console.log(data);
    }.bind(this))
  },
  render: function() {
    return (
      <div>
        <a href="/download" class="btn btn-primary">Download Selected</a>
        <button type="button" class="btn btn-primary" onClick={this.handleClick}>Update Selected</button>
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
    return {displayTracks: false, selected: false};
  },
  handleAlbumClick: function(event) {
    this.setState({displayTracks: !this.state.displayTracks});
    return false;
  },
  handleSelectToggle: function(event) {
    if (!this.state.selected) {
      albumsToDownload.push(this.props.key);
    } else {
      var i = albumsToDownload.indexOf(this.props.key);
      if (i > -1) {
        albumsToDownload.splice(i, 1);
      }
    }
    this.setState({selected: !this.state.selected});
  },
  render: function() {
    var tracks = this.state.displayTracks ? <Tracks tracks={this.props.album.tracks} /> : null;
    return (
      <tr key={this.props.key}>
        <td>{this.props.album.genre}</td>
        <td>{this.props.album.artist}</td>
        <td>
          <p><a href="" onClick={this.handleAlbumClick}>{this.props.album.album}</a></p>
          <p>{tracks}</p>
        </td>
        <td>
          <input type="checkbox" checked={this.state.selected ? 'checked' : ''} onChange={this.handleSelectToggle} />
        </td>
      </tr>
    ); 
  }
});

var AlbumList = React.createClass({
  getInitialState: function() {
    $.ajax({
      url: 'albums',
      dataType: 'json',
      mimeType: 'textPlain',
      success: function(data) {
        this.setState({albums: data});
      }.bind(this),
      error: function(err) {
        console.log('/albums error: ' + err);
      }.bind(this)
    });
    return {albums: []};
  },

  render: function() {
    var album_lines = [];

    this.state.albums.forEach(function(a) {
      var r;
      if (r = /(.*)\/(.*)\/(.*)/.exec(a.key)) {
        var a_ = {
          genre: r[1],
          artist: r[2],
          album: r[3],
          tracks: a.tracks
        }
        album_lines.push(<AlbumLine key={a.key} album={a_} />);
      }
    })

    return (
      <div>
      <DownloadAlbums />
      <table class="table table-striped">
        <thead>
          <tr>
            <th>Genre</th>
            <th>Artist</th>
            <th>Album</th>
            <th>Select</th>
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

React.renderComponent(
  <AlbumList />,
  document.getElementById('album-list')
);


