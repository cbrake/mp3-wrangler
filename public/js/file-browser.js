/** @jsx React.DOM */

var Files = React.createClass({
  render: function() {
      var hide = this.props.visible ? "" : "hide";
      return (
        <ul>
          <li>file1.mp3</li>
          <li>file2.mp3</li>
          <li>file3.mp3</li>
          <li>file4.mp3</li>
          <li>file5.mp3</li>
          <li>file6.mp3</li>
          <li>file7.mp3</li>
        </ul>
      );
  }
});

var AlbumLine = React.createClass({
  getInitialState: function() {
    return {displayFiles: false};
  },
  handleAlbumClick: function(event) {
    this.setState({displayFiles: !this.state.displayFiles});
    return false;
  },
  render: function() {
    var files = this.state.displayFiles ? <Files /> : null;
    return (
      <tr key={this.props.key}>
        <td>{this.props.album.genre}</td>
        <td>{this.props.album.artist}</td>
        <td>
          <p><a href="" onClick={this.handleAlbumClick}>{this.props.album.album}</a></p>
          <p>{files}</p>
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
    return {albums: {}};
  },

  render: function() {
    var album_lines = [];

    var i = 0;
    for (album in this.state.albums) {
      var a = this.state.albums[album]
      album_lines.push(<AlbumLine key={i} album={a} />);
      i++
    }

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


