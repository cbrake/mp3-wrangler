/** @jsx React.DOM */

var TrackLine = React.createClass({
  render: function() {
    var uri = "/file/" + this.props.key;
    return (
      <li><a href={uri}>{this.props.name}</a></li>
    );
  }
});

var Tracks = React.createClass({
  render: function() {
    console.log(this.props)
    var tracks_ = this.props.tracks;
    tracks_.sort()
    var tracks = tracks_.map(function(t) {
      var r = /.*\/(.*\.mp3)/.exec(t);
      var name = r[1];
      return <TrackLine key={t} name={name} />
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
      <table class="table table-striped">
        <thead>
          <tr>
            <th>Genre</th>
            <th>Artist</th>
            <th>Album</th>
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


